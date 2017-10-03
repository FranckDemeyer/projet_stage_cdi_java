import { Component, ViewChild } from '@angular/core';
import { ActionSheetController, AlertController, LoadingController, MenuController, ModalController, Platform } from 'ionic-angular';


import { VehicleDetailsComponent } from '../../components/vehicle-details/vehicle-details';

import { Account } from '../../models/account.model';
import { Image } from '../../models/image.model';
import { User } from '../../models/user.model';
import { Vehicle } from '../../models/vehicle.model';

import { AuthProvider } from '../../providers/auth';

import { AccountService } from '../../services/account.service';
import { ImgService } from '../../services/image.service';
import { UserService } from '../../services/user.service';

@Component({
    selector: 'page-user-profile',
    templateUrl: 'user-profile.html',
})
export class UserProfilePage {

    @ViewChild('deleteToggle') deleteToggle: any;
    notFirst: boolean = false;

    account: Account;
    activeMenu: string;
    connected: boolean = true;
    drivingLicence: string;
    idCard: string;
    photo: string;
    photoVehicles: string[] = [];
    user: User;
    users: User[] = [];
    userVehicles: Vehicle[] = [];

    constructor(private accountService: AccountService, private actionSheet: ActionSheetController, private alert: AlertController, private authProvider: AuthProvider, private imgService: ImgService, private loader: LoadingController, private menu: MenuController, private modal: ModalController, private platform: Platform, private userService: UserService) {
        this.menu.close();
        this.authProvider.authUser.subscribe(jwt => {
            if(jwt) {
                this.account = jwt.accountDTO;
                if(this.account.banned || this.account.deleted) this.menuBannedOrDeletedActive();
                else this.menuConnectedActive();
                this.getUser();
            } else {
                this.menuNotConnectedActive();
            }
        });
    }

    menuBannedOrDeletedActive() {
        this.activeMenu = 'menu-banned';
        this.menu.enable(true, 'menu-banned');
        this.menu.enable(false, 'menu-not-connected');
        this.menu.enable(false, 'menu-connected');
    }

    menuConnectedActive() {
        this.activeMenu = 'menu-connected';
        this.menu.enable(false, 'menu-banned');
        this.menu.enable(false, 'menu-not-connected');
        this.menu.enable(true, 'menu-connected');
    }

    menuNotConnectedActive() {
        this.activeMenu = 'menu-not-connected';
        this.menu.enable(false, 'menu-banned');
        this.menu.enable(true, 'menu-not-connected');
        this.menu.enable(false, 'menu-connected');
    }

    addVehicle() {
        let vId: string = '' + (Number(this.users[0].vehicles[this.users[0].vehicles.length - 1].vehicleId) + 1);
        let vehicle: Vehicle = {
            brand: '',
            color: '',
            carRegistration: '',
            model: '',
            name: '',
            photo: '',
            power: 1,
            registrationNumber: '',
            vehicleId:vId
        };
        this.getVehicleDetails(vehicle, true, -1);
    }

    delete() {
        if(this.notFirst) {
             this.notFirst = false;
         } else {
            if(!this.account.deleted) {
                let supprimer = this.alert.create({
                    title: "Suppression de compte",
                    message: "Etes vous sur de vouloir supprimer votre compte ?",
                    buttons: [
                        {
                            text: 'Supprimer',
                            handler: () => {
                                this.account.deleted = true;
                                this.accountService.update(this.account).subscribe();
                                this.menuBannedOrDeletedActive();
                            }
                        },
                        {
                            text: 'Annuler',
                            handler: () => {
                                this.notFirst = true; // block the second call of delete() due to uncheck
                                this.account.deleted = false;
                                this.deleteToggle.checked = false;
                            }
                        }
                    ]
                });
                supprimer.present();
            } else {
                this.account.deleted = false;
                this.accountService.update(this.account).subscribe();
                this.menuConnectedActive();
            }
        }
    }

    getImage(user: User): void {
        this.imgService.findByFileName(user.photo).subscribe(data => {
            if(data) {
                this.photo = 'data:image/jpeg;base64,' + data;
            } else {
                this.photo = '/assets/img/avatar.png';
            }
        });
        this.imgService.findByFileName(user.idCard).subscribe(data => {
            if(data) {
                this.idCard = 'data:image/jpeg;base64,' + data;
            } else {
                this.photo = '/assets/img/cni.jpg';
            }
        });
        this.imgService.findByFileName(user.drivingLicence).subscribe(data => {
            if(data) {
                this.drivingLicence = 'data:image/jpeg;base64,' + data;
            } else {
                this.photo = '/assets/img/pc.jpg';
            }
        })
    }

    getPhotoVehicles(user: User) {
        this.photoVehicles = [];
        let vehicles: Vehicle[] = user.vehicles;
        for(let i = 0, j = vehicles.length; i < j; i++) {
            this.imgService.findByFileName(vehicles[i].photo).subscribe(data => {
                if(data) {
                    this.photoVehicles[i] = 'data:image/jpeg;base64,' + data;
                } else {
                    this.photoVehicles[i] = '/assets/img/vehicule.png';
                }
            });
        }
    }

    getUser(): void {
        this.users = [];
        let loading = this.loader.create({
            spinner: 'bubbles',
            content: 'Chargement en cours...'
        });
        loading.present();
        this.userService.findByAccountId(this.account.accountId).finally(() => loading.dismiss()).subscribe(data => {
            this.user = data;
            this.users.push(this.user);
            this.userVehicles = this.user.vehicles;
            this.getImage(this.users[0]);
            this.getPhotoVehicles(this.users[0]);
        });

    }

    getVehicleDetails(vehicle: Vehicle, isNew: boolean, index: number) {
        let oldPhoto: string = vehicle.photo;
        let oldCarRegistration = vehicle.carRegistration;
        let profile = this.modal.create(VehicleDetailsComponent, {
            isNew: isNew,
            vehicle: vehicle
        });
        profile.onDidDismiss(data => {
            if(data) {
                if(isNew) {
                    let photo: Image = {
                        image: data.photo,
                        name: data.vehicle.photo,
                        type: 'image/jpeg'
                    };
                    this.imgService.add(photo).subscribe();
                    let carRegistration: Image = {
                        image: data.carRegistration,
                        name: data.vehicle.carRegistration,
                        type: 'image/jpeg'
                    };
                    this.imgService.add(carRegistration).subscribe();
                    this.user.vehicles.push(data.vehicle);
                } else {
                    console.log(oldPhoto !== data.vehicle.photo);
                    if(oldPhoto !== data.vehicle.photo) {
                        let photo: Image = {
                            image: data.photo,
                            name: data.vehicle.photo,
                            type: 'image/jpeg'
                        };
                        this.imgService.delete(oldPhoto).subscribe();
                        this.imgService.add(photo).subscribe();
                    }
                    if(oldCarRegistration !== data.vehicle.carRegistration) {
                        let carRegistration: Image = {
                            image: data.carRegistration,
                            name: data.vehicle.carRegistration,
                            type: 'image/jpeg'
                        };
                        this.imgService.delete(oldCarRegistration).subscribe();
                        this.imgService.add(carRegistration).subscribe();
                    }
                    this.user.vehicles[index] = data.vehicle;
                }
                this.userService.update(this.user).subscribe(() => this.getUser() );
            }
        });
        profile.present();
    }

    takePicture(sourceType: number) {

        //TODO : take the picture :)

        console.log(sourceType);
    }

    userPhotoClick() {
        let newPhoto = this.alert.create({
            title: 'Photo de profil',
            message: "Voulez-vous prendre une nouvelle photo de profil ? (Appui long sur la photo de profil pour d'autres options)",
            buttons: [
                {
                    text: 'oui',
                    handler: () => {
                        this.takePicture(1);
                    }
                },
                {
                    text: 'non',
                    handler: () => {}
                }
            ]
        });
        newPhoto.present();
    }

    userPhotoLongClick() {
        let actionSheetNewPhoto = this.actionSheet.create({
            title: "Changer de photo de profil",
            cssClass: 'action-sheets-basic-page',
            buttons: [
                {
                    text: 'utiliser l\'appareil photo',
                    icon: !this.platform.is('ios') ? 'camera' : '',
                    handler: () => {
                        this.takePicture(1);
                    }
                },
                {
                    text: 'Utiliser une photo présente dans l\'appareil',
                    icon: !this.platform.is('ios') ? 'image' : '',
                    handler: () => {
                        this.takePicture(0);
                    }
                },
                {
                    text: 'Annuler',
                    role: 'cancel',
                    icon: !this.platform.is('ios') ? 'close' : '',
                    handler: () => {}
                }
            ]
        });
        actionSheetNewPhoto.present();
    }

}
